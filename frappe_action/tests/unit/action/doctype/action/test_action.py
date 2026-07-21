# Copyright (c) 2026, Aurumor and Contributors
# See license.txt

from unittest.mock import MagicMock, patch
import frappe
from frappe.tests import UnitTestCase
from frappe_action.action.doctype.action.action import Action


class TestActionUnit(UnitTestCase):
	def setUp(self) -> None:
		super().setUp()

	def test_round_robin_allocation(self) -> None:
		# Arrange: Instantiate the specific Action controller directly to bypass global DocType naming conflicts
		action = Action({
			"doctype": "Action",
			"action_name": "Test RR Action",
			"assignment_rule": "Round Robin",
			"users": [
				{"user": "user1@example.com"},
				{"user": "user2@example.com"},
				{"user": "user3@example.com"}
			]
		})
		# Mock db_set to prevent actual DB writes during unit tests
		action.db_set = MagicMock()

		# Act & Assert
		# 1st time (no last_user) -> user1
		action.last_user = None
		self.assertEqual(action.determine_assignee(), "user1@example.com")
		action.db_set.assert_called_with("last_user", "user1@example.com")

		# 2nd time (last_user = user1) -> user2
		action.last_user = "user1@example.com"
		self.assertEqual(action.determine_assignee(), "user2@example.com")
		action.db_set.assert_called_with("last_user", "user2@example.com")

		# 3rd time (last_user = user2) -> user3
		action.last_user = "user2@example.com"
		self.assertEqual(action.determine_assignee(), "user3@example.com")
		action.db_set.assert_called_with("last_user", "user3@example.com")

		# 4th time (last_user = user3) -> user1 (loops)
		action.last_user = "user3@example.com"
		self.assertEqual(action.determine_assignee(), "user1@example.com")
		action.db_set.assert_called_with("last_user", "user1@example.com")

	def test_load_balancing_allocation(self) -> None:
		# Arrange: Instantiate the specific Action controller directly to bypass global DocType naming conflicts
		action = Action({
			"doctype": "Action",
			"action_name": "Test LB Action",
			"assignment_rule": "Load Balancing",
			"users": [
				{"user": "user1@example.com"},
				{"user": "user2@example.com"}
			]
		})

		# Patch locally after instantiation to prevent interfering with standard framework loads
		with patch("frappe.db.sql") as mock_sql:
			# Mock SQL response: user1 has 5, user2 has 2
			mock_sql.return_value = [
				{"allocated_to": "user1@example.com", "cnt": 5},
				{"allocated_to": "user2@example.com", "cnt": 2}
			]

			# Act
			assignee = action.determine_assignee()

			# Assert
			self.assertEqual(assignee, "user2@example.com")
			# Verify correct SQL filters
			sql_call_args = mock_sql.call_args[0][0]
			self.assertIn("SELECT allocated_to, COUNT(name) as cnt", sql_call_args)
