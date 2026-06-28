import json
import frappe
from frappe.tests import UnitTestCase

class TestActionCompiler(UnitTestCase):
    def test_should_compile_linear_nodes_to_vue_flow_json(self):
        action = frappe.get_doc({
            "doctype": "Action",
            "action_name": "Test Linear Action",
            "nodes": [
                {
                    "node_id": "node_1",
                    "node_type": "trigger",
                    "target_selector": "",
                    "extract_target": "",
                    "data_key": ""
                },
                {
                    "node_id": "node_2",
                    "node_type": "nodes:get-text",
                    "target_selector": "#title",
                    "extract_target": "innerText",
                    "data_key": "title"
                }
            ],
            "edges": [
                {
                    "source_node": "node_1",
                    "target_node": "node_2",
                    "condition": ""
                }
            ]
        })
        
        action.compile_json()
        
        compiled_data = json.loads(action.compiled_json)
        
        self.assertEqual(len(compiled_data["nodes"]), 2)
        self.assertEqual(len(compiled_data["edges"]), 1)
        
        self.assertEqual(compiled_data["nodes"][0]["id"], "node_1")
        self.assertEqual(compiled_data["nodes"][1]["id"], "node_2")
        self.assertEqual(compiled_data["nodes"][1]["data"]["target_selector"], "#title")
        
        self.assertEqual(compiled_data["edges"][0]["source"], "node_1")
        self.assertEqual(compiled_data["edges"][0]["target"], "node_2")

    def test_should_compile_branching_conditions(self):
        action = frappe.get_doc({
            "doctype": "Action",
            "action_name": "Test Branching Action",
            "nodes": [
                {"node_id": "trigger", "node_type": "trigger"},
                {"node_id": "path_a", "node_type": "hitl"},
                {"node_id": "path_b", "node_type": "hitl"}
            ],
            "edges": [
                {"source_node": "trigger", "target_node": "path_a", "condition": "amount > 100"},
                {"source_node": "trigger", "target_node": "path_b", "condition": "amount <= 100"}
            ]
        })
        
        action.compile_json()
        
        compiled_data = json.loads(action.compiled_json)
        
        self.assertEqual(len(compiled_data["nodes"]), 3)
        self.assertEqual(len(compiled_data["edges"]), 2)
        
        self.assertEqual(compiled_data["edges"][0]["data"]["condition"], "amount > 100")
        self.assertEqual(compiled_data["edges"][1]["data"]["condition"], "amount <= 100")
