import frappe
from frappe.tests import UnitTestCase

class TestJinjaRouting(UnitTestCase):
    def test_should_render_target_url_with_todo_context(self):
        # Mock a ToDo document
        todo = frappe.get_doc({
            "doctype": "ToDo",
            "reference_type": "Lead",
            "reference_name": "LEAD-001",
            "description": "Test"
        })
        
        target_url_template = "/app/lead/{{ doc.reference_name }}"
        
        rendered_url = frappe.render_template(target_url_template, {"doc": todo})
        
        self.assertEqual(rendered_url, "/app/lead/LEAD-001")
