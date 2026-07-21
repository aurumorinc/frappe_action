# Copyright (c) 2026, Aurumor and contributors
# For license information, please see license.txt

import json
import frappe
from frappe.model.document import Document


class Action(Document):
	def before_save(self) -> None:
		self.compile_json()

	def compile_json(self) -> None:
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

	def determine_assignee(self) -> str | None:
		if not self.get("users"):
			return self.owner or frappe.session.user

		user_ids = [u.get("user") for u in self.users if u.get("user")]
		if not user_ids:
			return self.owner or frappe.session.user

		if self.assignment_rule == "Round Robin":
			if not self.last_user or self.last_user not in user_ids:
				assignee = user_ids[0]
			else:
				idx = user_ids.index(self.last_user)
				next_idx = (idx + 1) % len(user_ids)
				assignee = user_ids[next_idx]
			self.db_set("last_user", assignee)
			return assignee

		elif self.assignment_rule == "Load Balancing":
			counts = frappe.db.sql(
				"""
				SELECT allocated_to, COUNT(name) as cnt
				FROM `tabToDo`
				WHERE allocated_to IN %s AND status = 'Open' AND action = %s
				GROUP BY allocated_to
				""", (tuple(user_ids), self.name), as_dict=True
			)
			user_counts = {u: 0 for u in user_ids}
			for c in counts:
				user_counts[c.get("allocated_to")] = c.get("cnt", 0)
			assignee = min(user_counts, key=user_counts.get)
			return assignee

		return self.owner or frappe.session.user

	def on_update(self) -> None:
		doc_before_save = self.get_doc_before_save()
		old_users = [u.get("user") for u in (doc_before_save.get("users") or []) if u.get("user")] if doc_before_save else []
		new_users = [u.get("user") for u in (self.get("users") or []) if u.get("user")]

		if set(old_users) != set(new_users):
			frappe.enqueue(
				"frappe_action.action.doctype.action.action.rebalance_action_todos",
				action_name=self.name,
				old_users=old_users,
				new_users=new_users,
				queue="long"
			)


@frappe.whitelist()
def rebalance_action_todos(action_name: str, old_users: list[str], new_users: list[str]) -> None:
	if not frappe.db.exists("Action", action_name):
		return

	action_doc = frappe.get_doc("Action", action_name)
	removed_users = set(old_users) - set(new_users)

	if removed_users:
		open_todos = frappe.get_all(
			"ToDo",
			filters={
				"action": action_name,
				"status": "Open",
				"allocated_to": ["in", list(removed_users)]
			},
			fields=["name"]
		)
		for t in open_todos:
			todo_doc = frappe.get_doc("ToDo", t.name)
			new_assignee = action_doc.determine_assignee()
			if new_assignee:
				todo_doc.allocated_to = new_assignee
				todo_doc.save(ignore_permissions=True)

	added_users = set(new_users) - set(old_users)
	if added_users and new_users:
		new_user_ids = list(new_users)
		open_todos = frappe.get_all(
			"ToDo",
			filters={
				"action": action_name,
				"status": "Open",
				"allocated_to": ["in", new_user_ids]
			},
			fields=["name", "allocated_to"],
			order_by="creation desc"
		)
		if open_todos:
			target_count = len(open_todos) // len(new_user_ids)
			todos_by_user = {u: [] for u in new_user_ids}
			for t in open_todos:
				if t.allocated_to in todos_by_user:
					todos_by_user[t.allocated_to].append(t)

			excess_todos = []
			for u, t_list in todos_by_user.items():
				if len(t_list) > target_count:
					excess_count = len(t_list) - target_count
					excess_todos.extend(t_list[:excess_count])
					todos_by_user[u] = t_list[excess_count:]

			for u, t_list in todos_by_user.items():
				while len(t_list) < target_count and excess_todos:
					todo_to_move = excess_todos.pop()
					todo_doc = frappe.get_doc("ToDo", todo_to_move.name)
					todo_doc.allocated_to = u
					todo_doc.save(ignore_permissions=True)
					t_list.append(todo_to_move)

			while excess_todos:
				underloaded_sorted = sorted(todos_by_user.keys(), key=lambda k: len(todos_by_user[k]))
				target_user = underloaded_sorted[0]
				todo_to_move = excess_todos.pop()
				todo_doc = frappe.get_doc("ToDo", todo_to_move.name)
				todo_doc.allocated_to = target_user
				todo_doc.save(ignore_permissions=True)
				todos_by_user[target_user].append(todo_to_move)
