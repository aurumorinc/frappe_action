import json
import frappe
from frappe.tests import UnitTestCase
from frappe.utils import add_days, nowdate
from frappe_action.todo import get_open, get_report, get_sub, save, trigger_sub

class TestToDoAPI(UnitTestCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        
        # Load fixtures to ensure custom fields exist
        from frappe.utils.fixtures import sync_fixtures
        sync_fixtures("frappe_action")
        frappe.db.commit()

        # Create test users
        for user in ["test_user_a@example.com", "test_user_b@example.com"]:
            if not frappe.db.exists("User", user):
                frappe.get_doc({
                    "doctype": "User",
                    "email": user,
                    "first_name": user.split("@")[0],
                    "send_welcome_email": 0
                }).insert(ignore_permissions=True)
        frappe.db.commit()

        # Create a test action
        if not frappe.db.exists("Action", "_Test Action"):
            frappe.get_doc({
                "doctype": "Action",
                "action_name": "_Test Action",
                "description": "Test Action Description"
            }).insert()
        frappe.db.commit()

    @classmethod
    def tearDownClass(cls):
        frappe.db.rollback()
        super().tearDownClass()

    def setUp(self):
        # Clear existing ToDos for test users to ensure clean state
        frappe.db.delete("ToDo", {"allocated_to": ["in", ["test_user_a@example.com", "test_user_b@example.com"]]})
        frappe.set_user("test_user_a@example.com")

    def tearDown(self):
        frappe.db.rollback()
        frappe.set_user("Administrator")
        super().tearDown()

    def test_get_open_happy_path(self):
        """Test getting open and recently closed ToDos."""
        # Create 2 open ToDos
        for i in range(2):
            frappe.get_doc({"doctype": "ToDo", "description": f"Open {i}", "allocated_to": "test_user_a@example.com", "status": "Open", "action": "_Test Action"}).insert(ignore_permissions=True)
        
        # Create 1 closed ToDo
        frappe.get_doc({"doctype": "ToDo", "description": "Closed 1", "allocated_to": "test_user_a@example.com", "status": "Closed", "action": "_Test Action"}).insert(ignore_permissions=True)

        result = get_open()
        self.assertEqual(len(result["open_todos"]), 2)
        self.assertEqual(len(result["recent_closed"]), 1)

    def test_get_open_filters_out_no_action(self):
        """Test that get_open only returns ToDos with an action."""
        frappe.get_doc({"doctype": "ToDo", "description": "With Action", "allocated_to": "test_user_a@example.com", "status": "Open", "action": "_Test Action"}).insert(ignore_permissions=True)
        frappe.get_doc({"doctype": "ToDo", "description": "Without Action", "allocated_to": "test_user_a@example.com", "status": "Open"}).insert(ignore_permissions=True)

        result = get_open()
        self.assertEqual(len(result["open_todos"]), 1)
        self.assertEqual(result["open_todos"][0].description, "With Action")

    def test_get_open_custom_limit(self):
        """Test getting open ToDos with a custom limit."""
        for i in range(5):
            frappe.get_doc({"doctype": "ToDo", "description": f"Open {i}", "allocated_to": "test_user_a@example.com", "status": "Open", "action": "_Test Action"}).insert(ignore_permissions=True)
        
        result = get_open(limit=3)
        self.assertEqual(len(result["open_todos"]), 3)

    def test_get_open_isolation(self):
        """Test that get_open only returns ToDos for the current user."""
        frappe.get_doc({"doctype": "ToDo", "description": "User A Open", "allocated_to": "test_user_a@example.com", "status": "Open", "action": "_Test Action"}).insert(ignore_permissions=True)
        frappe.get_doc({"doctype": "ToDo", "description": "User B Open", "allocated_to": "test_user_b@example.com", "status": "Open", "action": "_Test Action"}).insert(ignore_permissions=True)

        result = get_open()
        self.assertEqual(len(result["open_todos"]), 1)
        self.assertEqual(result["open_todos"][0].description, "User A Open")

    def test_get_report_happy_path(self):
        """Test getting the report counts."""
        frappe.get_doc({"doctype": "ToDo", "description": "Open 1", "allocated_to": "test_user_a@example.com", "status": "Open", "action": "_Test Action"}).insert(ignore_permissions=True)
        frappe.get_doc({"doctype": "ToDo", "description": "Closed 1", "allocated_to": "test_user_a@example.com", "status": "Closed", "action": "_Test Action"}).insert(ignore_permissions=True)

        result = get_report()
        self.assertEqual(result["total_open"], 1)
        self.assertEqual(result["completed_today"], 1)

    def test_get_report_date_boundaries(self):
        """Test that get_report only counts ToDos completed today."""
        # Create a ToDo closed yesterday
        yesterday = add_days(nowdate(), -1)
        doc = frappe.get_doc({"doctype": "ToDo", "description": "Closed Yesterday", "allocated_to": "test_user_a@example.com", "status": "Closed", "action": "_Test Action"}).insert(ignore_permissions=True)
        # Manually update modified date to yesterday
        frappe.db.sql("update `tabToDo` set modified = %s where name = %s", (yesterday, doc.name))

        result = get_report()
        self.assertEqual(result["completed_today"], 0)

    def test_get_report_isolation(self):
        """Test that get_report only counts ToDos for the current user."""
        frappe.get_doc({"doctype": "ToDo", "description": "User A Open", "allocated_to": "test_user_a@example.com", "status": "Open", "action": "_Test Action"}).insert(ignore_permissions=True)
        frappe.get_doc({"doctype": "ToDo", "description": "User B Open", "allocated_to": "test_user_b@example.com", "status": "Open", "action": "_Test Action"}).insert(ignore_permissions=True)

        result = get_report()
        self.assertEqual(result["total_open"], 1)

    def test_get_sub_happy_path(self):
        """Test getting sub-todos for a parent."""
        parent = frappe.get_doc({"doctype": "ToDo", "description": "Parent", "allocated_to": "test_user_a@example.com", "action": "_Test Action"}).insert(ignore_permissions=True)
        frappe.get_doc({"doctype": "ToDo", "description": "Sub 1", "allocated_to": "test_user_a@example.com", "main": parent.name, "action": "_Test Action"}).insert(ignore_permissions=True)
        
        result = get_sub(parent.name)
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0].description, "Sub 1")

    def test_get_sub_isolation(self):
        """Test that get_sub only returns sub-todos for the current user."""
        parent = frappe.get_doc({"doctype": "ToDo", "description": "Parent", "allocated_to": "test_user_a@example.com", "action": "_Test Action"}).insert(ignore_permissions=True)
        frappe.get_doc({"doctype": "ToDo", "description": "Sub User B", "allocated_to": "test_user_b@example.com", "main": parent.name, "action": "_Test Action"}).insert(ignore_permissions=True)
        
        result = get_sub(parent.name)
        self.assertEqual(len(result), 0)

    def test_save_happy_path(self):
        """Test saving a ToDo."""
        todo = frappe.get_doc({"doctype": "ToDo", "description": "To Update", "allocated_to": "test_user_a@example.com", "action": "_Test Action"}).insert(ignore_permissions=True)
        
        updated_doc = {"name": todo.name, "description": "Updated"}
        result = save(updated_doc)
        
        self.assertEqual(result["description"], "Updated")
        
        # Test with JSON string
        updated_doc_str = json.dumps({"name": todo.name, "description": "Updated Again"})
        result_str = save(updated_doc_str)
        self.assertEqual(result_str["description"], "Updated Again")

    def test_save_permission_error(self):
        """Test saving a ToDo allocated to another user throws PermissionError."""
        frappe.set_user("test_user_b@example.com")
        todo = frappe.get_doc({"doctype": "ToDo", "description": "User B ToDo", "allocated_to": "test_user_b@example.com", "action": "_Test Action"}).insert(ignore_permissions=True)
        
        frappe.set_user("test_user_a@example.com")
        with self.assertRaises(frappe.PermissionError):
            save({"name": todo.name, "description": "Hacked"})

    def test_save_admin_override(self):
        """Test Administrator can save any ToDo."""
        todo = frappe.get_doc({"doctype": "ToDo", "description": "User A ToDo", "allocated_to": "test_user_a@example.com", "action": "_Test Action"}).insert(ignore_permissions=True)
        
        frappe.set_user("Administrator")
        result = save({"name": todo.name, "description": "Admin Updated"})
        self.assertEqual(result["description"], "Admin Updated")

    def test_trigger_sub_happy_path(self):
        """Test triggering a sub-todo."""
        parent = frappe.get_doc({"doctype": "ToDo", "description": "Parent", "allocated_to": "test_user_a@example.com", "action": "_Test Action"}).insert(ignore_permissions=True)
        
        result = trigger_sub(parent.name, "_Test Action")
        self.assertEqual(result["status"], "success")
        
        sub_todo = frappe.get_doc("ToDo", result["todo_id"])
        self.assertEqual(sub_todo.get("main"), parent.name)
        self.assertEqual(sub_todo.get("action"), "_Test Action")
        self.assertEqual(sub_todo.allocated_to, "test_user_a@example.com")

    def test_trigger_sub_action_not_found(self):
        """Test triggering a sub-todo with invalid action."""
        parent = frappe.get_doc({"doctype": "ToDo", "description": "Parent", "allocated_to": "test_user_a@example.com", "action": "_Test Action"}).insert(ignore_permissions=True)
        
        with self.assertRaises(frappe.ValidationError):
            trigger_sub(parent.name, "Invalid Action")

    def test_trigger_sub_idor_vulnerability(self):
        """
        Test potential IDOR vulnerability where a user can create a sub-todo
        for a parent ToDo they don't own.
        Currently, the code does NOT check this, so this test might pass even if it shouldn't,
        or we can write it to expect the current behavior and flag it.
        Let's write it to expect a PermissionError, which will fail if the vulnerability exists,
        highlighting the need for a fix.
        """
        frappe.set_user("test_user_b@example.com")
        parent_b = frappe.get_doc({"doctype": "ToDo", "description": "Parent B", "allocated_to": "test_user_b@example.com", "action": "_Test Action"}).insert(ignore_permissions=True)
        
        frappe.set_user("test_user_a@example.com")
        
        # User A tries to create a sub-todo for User B's parent ToDo
        # Ideally, this should raise a PermissionError.
        # If it doesn't, the test will fail, indicating the vulnerability is present.
        with self.assertRaises(frappe.PermissionError):
            trigger_sub(parent_b.name, "_Test Action")
