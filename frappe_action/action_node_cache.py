# Copyright (c) 2024, Frappe Technologies and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document

class ActionCache(Document):
	pass
import frappe
import hashlib
import json
import litellm

@frappe.whitelist()
def get(instruction: str, url: str) -> dict:
	"""
	Check if an action is cached for the given instruction and URL.
	"""
	instruction_hash = hashlib.sha256(f"{instruction}:{url}".encode()).hexdigest()
	
	cache_entry = frappe.get_all(
		"Action Node Cache",
		filters={"instruction_hash": instruction_hash},
		fields=["selector", "method", "arguments"],
		limit=1
	)
	
	if cache_entry:
		entry = cache_entry[0]
		return {
			"hit": True,
			"selector": entry.selector,
			"method": entry.method,
			"arguments": json.loads(entry.arguments) if entry.arguments else None
		}
	
	return {"hit": False}

@frappe.whitelist()
def save(instruction: str, url: str, selector: str, method: str, arguments: str = None) -> dict:
	"""
	Save a successfully resolved action to the cache.
	"""
	instruction_hash = hashlib.sha256(f"{instruction}:{url}".encode()).hexdigest()
	
	# Check if it already exists to avoid duplicates
	if frappe.db.exists("Action Node Cache", {"instruction_hash": instruction_hash}):
		doc = frappe.get_doc("Action Node Cache", {"instruction_hash": instruction_hash})
		doc.selector = selector
		doc.method = method
		doc.arguments = arguments
		doc.save(ignore_permissions=True)
	else:
		doc = frappe.get_doc({
			"doctype": "Action Node Cache",
			"instruction_hash": instruction_hash,
			"instruction": instruction,
			"url": url,
			"selector": selector,
			"method": method,
			"arguments": arguments
		})
		doc.insert(ignore_permissions=True)
	
	frappe.db.commit()
	return {"status": "success"}

@frappe.whitelist()
def infer_action(action_id: str, instruction: str, dom_tree: str) -> dict:
	"""
	Use LiteLLM to infer the element ID and method from the DOM tree.
	"""
	action = frappe.get_doc("Action", action_id)
	if not action.model:
		frappe.throw("No LLM Model linked to this Action.")
		
	model = frappe.get_doc("Model", action.model)
	
	# Configure LiteLLM
	litellm.api_key = model.get_password("api_key")
	if model.api_base:
		litellm.api_base = model.api_base
	if model.api_version:
		litellm.api_version = model.api_version
		
	prompt = f"""
You are an expert browser automation agent.
Given the following simplified DOM tree, find the element that best matches the instruction.

Instruction: {instruction}

DOM Tree:
{dom_tree}

Return a JSON object with the following structure:
{{
	"elementId": "The ID of the element (e.g., '1-67')",
	"method": "The action to perform (e.g., 'click', 'type', 'hover')",
	"arguments": ["Any arguments for the method, like text to type"]
}}
"""

	try:
		response = litellm.completion(
			model=model.model_name,
			messages=[{"role": "user", "content": prompt}],
			temperature=model.temperature,
			max_tokens=model.max_tokens,
			response_format={"type": "json_object"}
		)
		
		content = response.choices[0].message.content
		result = json.loads(content)
		return result
	except Exception as e:
		frappe.log_error(f"LiteLLM Inference Error: {str(e)}", "Action Cache Inference")
		frappe.throw(f"Failed to infer action: {str(e)}")
