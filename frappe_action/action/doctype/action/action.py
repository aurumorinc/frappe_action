# Copyright (c) 2026, Aurumor and contributors
# For license information, please see license.txt

import json
import frappe
from frappe.model.document import Document


class Action(Document):
    def before_save(self):
        self.compile_json()

    def compile_json(self):
        compiled_data = {
            "nodes": [],
            "edges": []
        }

        for node in self.get("nodes", []):
            compiled_data["nodes"].append({
                "id": node.node_id,
                "type": node.node_type,
                "data": {
                    "target_selector": node.target_selector,
                    "extract_target": node.extract_target,
                    "data_key": node.data_key,
                    "url_template": node.url_template,
                    "message": node.message,
                    "is_sub_task": node.is_sub_task
                }
            })

        for edge in self.get("edges", []):
            compiled_data["edges"].append({
                "id": f"e-{edge.source_node}-{edge.target_node}",
                "source": edge.source_node,
                "target": edge.target_node,
                "data": {
                    "condition": edge.condition
                }
            })

        self.compiled_json = json.dumps(compiled_data, indent=2)
