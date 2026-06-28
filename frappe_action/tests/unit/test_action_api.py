import frappe
from frappe.tests import UnitTestCase
from frappe_action.action_api import get

class TestActionAPI(UnitTestCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        
        # Create a test action
        if not frappe.db.exists("Action", "_Test Action"):
            frappe.get_doc({
                "doctype": "Action",
                "action_name": "_Test Action"
            }).insert()
        frappe.db.commit()

    @classmethod
    def tearDownClass(cls):
        frappe.db.rollback()
        super().tearDownClass()

    def tearDown(self):
        frappe.db.rollback()
        super().tearDown()

    def test_get_action_success(self):
        """Test getting an existing action."""
        action_dict = get("_Test Action")
        self.assertEqual(action_dict.get("name"), "_Test Action")

    def test_get_action_not_found(self):
        """Test getting a non-existent action throws ValidationError."""
        with self.assertRaises(frappe.ValidationError) as context:
            get("Non Existent Action")
        
        self.assertIn("The requested action 'Non Existent Action' could not be found.", str(context.exception))

    def test_get_action_empty_name(self):
        """Test getting an action with empty name throws ValidationError."""
        with self.assertRaises(frappe.ValidationError):
            get("")
        
        with self.assertRaises(frappe.ValidationError):
            get(None)
