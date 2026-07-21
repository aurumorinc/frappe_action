# Copyright (c) 2026, Aurumor and Contributors
# See license.txt

from unittest.mock import MagicMock, patch
import frappe
from frappe.tests import IntegrationTestCase


class IntegrationTestAction(IntegrationTestCase):
	"""
	Integration tests for Action.
	"""
	@classmethod
	def setUpClass(cls) -> None:
		super().setUpClass()
		# Create test users if they don't exist
		for email in ["user1@example.com", "user2@example.com"]:
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

	@patch("frappe.enqueue")
	def test_user_modification_enqueues_fs_job(self, mock_enqueue: MagicMock) -> None:
		# Arrange
		action = frappe.get_doc({
			"doctype": "Action",
			"action_name": "Test RR Enqueue Action",
			"assignment_rule": "Round Robin",
			"users": [{"user": "user1@example.com"}]
		}).insert()

		# Act: Add user2 to the users table and save
		action.append("users", {"user": "user2@example.com"})
		action.save()

		# Assert: Verify that frappe.enqueue was triggered
		mock_enqueue.assert_called_with(
			"frappe_action.action.doctype.action.action.rebalance_action_todos",
			action_name=action.name,
			old_users=["user1@example.com"],
			new_users=["user1@example.com", "user2@example.com"],
			queue="long"
		)

	def test_action_user_removed_rebalances_open_todos_async(self) -> None:
		# Arrange: Insert an Action with users user1@example.com and user2@example.com, set to Load Balancing
		action = frappe.get_doc({
			"doctype": "Action",
			"action_name": "Test Removed User Action",
			"assignment_rule": "Load Balancing",
			"users": [
				{"user": "user1@example.com"},
				{"user": "user2@example.com"}
			]
		}).insert()

		# Insert 4 open ToDos assigned to user1 and user2 (2 each)
		todo1 = frappe.get_doc({"doctype": "ToDo", "description": "T1", "allocated_to": "user1@example.com", "action": action.name}).insert()
		todo2 = frappe.get_doc({"doctype": "ToDo", "description": "T2", "allocated_to": "user1@example.com", "action": action.name}).insert()
		todo3 = frappe.get_doc({"doctype": "ToDo", "description": "T3", "allocated_to": "user2@example.com", "action": action.name}).insert()
		todo4 = frappe.get_doc({"doctype": "ToDo", "description": "T4", "allocated_to": "user2@example.com", "action": action.name}).insert()

		# Update Action in database to only have user2
		action.set("users", [])
		action.append("users", {"user": "user2@example.com"})
		with patch("frappe.enqueue"):
			action.save()

		# Act: Directly trigger background function, simulating worker execution after user1 is removed from Action
		from frappe_action.action.doctype.action.action import rebalance_action_todos
		rebalance_action_todos(action.name, ["user1@example.com", "user2@example.com"], ["user2@example.com"])

		# Assert: Verify all 4 open ToDos are now allocated to user2
		self.assertEqual(frappe.db.get_value("ToDo", todo1.name, "allocated_to"), "user2@example.com")
		self.assertEqual(frappe.db.get_value("ToDo", todo2.name, "allocated_to"), "user2@example.com")
		self.assertEqual(frappe.db.get_value("ToDo", todo3.name, "allocated_to"), "user2@example.com")
		self.assertEqual(frappe.db.get_value("ToDo", todo4.name, "allocated_to"), "user2@example.com")

	def test_action_user_added_rebalances_open_todos_async(self) -> None:
		# Arrange: Insert an Action with user1 hold 4 open ToDos
		action = frappe.get_doc({
			"doctype": "Action",
			"action_name": "Test Added User Action",
			"assignment_rule": "Load Balancing",
			"users": [
				{"user": "user1@example.com"}
			]
		}).insert()

		todo1 = frappe.get_doc({"doctype": "ToDo", "description": "T1", "allocated_to": "user1@example.com", "action": action.name}).insert()
		todo2 = frappe.get_doc({"doctype": "ToDo", "description": "T2", "allocated_to": "user1@example.com", "action": action.name}).insert()
		todo3 = frappe.get_doc({"doctype": "ToDo", "description": "T3", "allocated_to": "user1@example.com", "action": action.name}).insert()
		todo4 = frappe.get_doc({"doctype": "ToDo", "description": "T4", "allocated_to": "user1@example.com", "action": action.name}).insert()

		# Update Action in database to have user1 and user2
		action.set("users", [])
		action.append("users", {"user": "user1@example.com"})
		action.append("users", {"user": "user2@example.com"})
		with patch("frappe.enqueue"):
			action.save()

		# Act: Simulate adding user2 and rebalancing
		from frappe_action.action.doctype.action.action import rebalance_action_todos
		rebalance_action_todos(action.name, ["user1@example.com"], ["user1@example.com", "user2@example.com"])

		# Assert: Verify load is balanced to 2 each
		user1_todos = frappe.get_all("ToDo", filters={"action": action.name, "allocated_to": "user1@example.com", "status": "Open"})
		user2_todos = frappe.get_all("ToDo", filters={"action": action.name, "allocated_to": "user2@example.com", "status": "Open"})

		self.assertEqual(len(user1_todos), 2)
		self.assertEqual(len(user2_todos), 2)
