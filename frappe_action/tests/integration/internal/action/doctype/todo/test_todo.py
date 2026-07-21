# Copyright (c) 2026, Aurumor and Contributors
# See license.txt

import frappe
from frappe.tests import IntegrationTestCase


class IntegrationTestToDo(IntegrationTestCase):
	"""
	Integration tests for ToDo auto-assignment hooks.
	"""
	@classmethod
	def setUpClass(cls) -> None:
		super().setUpClass()
		# Create test users if they don't exist
		for email in ["test_user1@example.com", "test_user2@example.com"]:
			if not frappe.db.exists("User", email):
				frappe.get_doc({
					"doctype": "User",
					"email": email,
					"first_name": email.split("@")[0],
					"send_welcome_email": 0
				}).insert(ignore_permissions=True)
		frappe.db.commit()

	@classmethod
	def tearDownClass(cls) -> None:
		frappe.db.rollback()
		super().tearDownClass()

	def setUp(self) -> None:
		super().setUp()

	def tearDown(self) -> None:
		frappe.db.rollback()
		super().tearDown()

	def test_todo_created_with_action_auto_allocates(self) -> None:
		# Arrange
		action = frappe.get_doc({
			"doctype": "Action",
			"action_name": "Test RR Auto Allocate Action",
			"assignment_rule": "Round Robin",
			"users": [
				{"user": "test_user1@example.com", "weight": 1},
				{"user": "test_user2@example.com", "weight": 1}
			]
		}).insert()

		# Act: Insert a new ToDo pointing to that action without allocated_to
		todo = frappe.get_doc({
			"doctype": "ToDo",
			"description": "Auto allocate this",
			"action": action.name
		}).insert()

		# Assert: Verify ToDo has allocated_to set to test_user1@example.com
		self.assertEqual(todo.allocated_to, "test_user1@example.com")

	def test_todo_creation_with_empty_or_draft_action(self) -> None:
		# Arrange: Insert draft Action with empty configuration (e.g. no nodes) but users configured
		action = frappe.get_doc({
			"doctype": "Action",
			"action_name": "Test RR Draft Action",
			"assignment_rule": "Round Robin",
			"users": [
				{"user": "test_user1@example.com", "weight": 1}
			]
		}).insert()

		# Act: Insert a ToDo pointing to that action
		todo = frappe.get_doc({
			"doctype": "ToDo",
			"description": "Auto allocate draft",
			"action": action.name
		}).insert()

		# Assert: Ensure ToDo inserts successfully and auto-allocates
		self.assertEqual(todo.allocated_to, "test_user1@example.com")
