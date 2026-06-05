import json
import frappe
from frappe.tests import IntegrationTestCase
from frappe_orbit.todo import get_active, submit_task_data

class TestTodoAPI(IntegrationTestCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        
        # Create Action
        if not frappe.db.exists("Action", "Test API Action"):
            action = frappe.get_doc({
                "doctype": "Action",
                "action_name": "Test API Action",
                "target_url": "/app/test",
                "nodes": [
                    {"node_id": "trigger", "node_type": "trigger"}
                ]
            }).insert()
        else:
            action = frappe.get_doc("Action", "Test API Action")
            
        cls.action = action

    @classmethod
    def tearDownClass(cls):
        frappe.db.rollback()
        super().tearDownClass()

    def test_get_active_should_return_oldest_assigned_todo(self):
        # Create two ToDos
        todo1 = frappe.get_doc({
            "doctype": "ToDo",
            "description": "Test 1",
            "allocated_to": frappe.session.user,
            "action": self.action.name
        }).insert()
        
        todo2 = frappe.get_doc({
            "doctype": "ToDo",
            "description": "Test 2",
            "allocated_to": frappe.session.user,
            "action": self.action.name
        }).insert()
        
        # Ensure todo1 is older
        frappe.db.set_value("ToDo", todo1.name, "creation", "2020-01-01 00:00:00")
        frappe.db.set_value("ToDo", todo2.name, "creation", "2020-01-02 00:00:00")
        
        active_task = get_active()
        
        self.assertIsNotNone(active_task)
        self.assertEqual(active_task["todo_id"], todo1.name)
        self.assertEqual(active_task["action_name"], "Test API Action")
        self.assertEqual(active_task["target_url"], "/app/test")

    def test_submit_task_data_should_save_payload_and_close_todo(self):
        todo = frappe.get_doc({
            "doctype": "ToDo",
            "description": "Test Submit",
            "allocated_to": frappe.session.user,
            "action": self.action.name
        }).insert()
        
        payload = {"email": "test@test.com"}
        
        result = submit_task_data(todo.name, payload)
        
        self.assertEqual(result["status"], "success")
        
        todo.reload()
        self.assertEqual(todo.status, "Closed")
        self.assertEqual(json.loads(todo.response_body), payload)
