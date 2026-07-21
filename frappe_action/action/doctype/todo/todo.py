# Copyright (c) 2026, Aurumor and contributors
# For license information, please see license.txt

import frappe
from typing import Any


def before_insert(doc: Any, method: str | None = None) -> None:
	_inherit_parent_assignment(doc)
	_auto_allocate_action(doc)


def _inherit_parent_assignment(doc: Any) -> bool:
	if doc.get("main"):
		allocated_to = frappe.db.get_value("ToDo", doc.get("main"), "allocated_to")
		doc.allocated_to = allocated_to
		return True
	return False


def _auto_allocate_action(doc: Any) -> None:
	if doc.get("action") and not doc.get("allocated_to"):
		action_doc = frappe.get_doc("Action", doc.get("action"))
		user = action_doc.determine_assignee()
		if user:
			doc.allocated_to = user
