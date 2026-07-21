# Copyright (c) 2026, Aurumor and Contributors
# See license.txt

from unittest.mock import MagicMock, patch
import frappe
from frappe.tests import UnitTestCase
from frappe_action.action.doctype.todo.todo import before_insert


class TestToDoUnit(UnitTestCase):
	def setUp(self) -> None:
		super().setUp()

	def test_sub_task_assignment_inheritance(self) -> None:
		# Arrange: Set up a parent ToDo assigned to user1
		parent_id = "parent-todo-123"

		# Initialize a child ToDo pointing to parent_id
		child_todo = frappe.get_doc({
			"doctype": "ToDo",
			"description": "Child ToDo description",
			"main": parent_id,
			"action": "Some Action"
		})

		# Patch locally to prevent interfering with standard framework loads during instantiation
		with patch("frappe.db.get_value") as mock_get_value:
			mock_get_value.return_value = "user1@example.com"

			# Act: Call before_insert hook
			before_insert(child_todo)

			# Assert: Verify get_value called with correct arguments
			mock_get_value.assert_called_with("ToDo", parent_id, "allocated_to")
			# The child ToDo's assignee is explicitly user1
			self.assertEqual(child_todo.allocated_to, "user1@example.com")
