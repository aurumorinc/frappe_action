import frappe
from frappe.tests import IntegrationTestCase
from unittest.mock import patch
import json
from frappe_action.action_node_cache import get, save, infer_action

class TestActionCacheAPI(IntegrationTestCase):
	@patch("frappe_action.action_node_cache.frappe.db.exists")
	@patch("frappe_action.action_node_cache.frappe.get_doc")
	@patch("frappe_action.action_node_cache.frappe.get_all")
	@patch("frappe_action.action_node_cache.frappe.db.commit")
	def test_save_and_get_cache(self, mock_commit, mock_get_all, mock_get_doc, mock_exists):
		instruction = "click login"
		url = "https://example.com"
		selector = "//button[@id='login']"
		method = "click"
		
		# Mock save
		mock_exists.return_value = False
		mock_doc = mock_get_doc.return_value
		
		res = save(instruction, url, selector, method)
		self.assertEqual(res.get("status"), "success")
		mock_doc.insert.assert_called_once()
		mock_commit.assert_called_once()
		
		# Mock get hit
		class MockEntry:
			selector = "//button[@id='login']"
			method = "click"
			arguments = None
		mock_get_all.return_value = [MockEntry()]
		
		res = get(instruction, url)
		self.assertTrue(res.get("hit"))
		self.assertEqual(res.get("selector"), selector)
		self.assertEqual(res.get("method"), method)
		
		# Mock get miss
		mock_get_all.return_value = []
		res = get("click logout", url)
		self.assertFalse(res.get("hit"))

	@patch("frappe_action.action_node_cache.frappe.get_doc")
	@patch("frappe_action.action_node_cache.litellm.completion")
	def test_infer_action(self, mock_completion, mock_get_doc):
		# Mock the LiteLLM response
		class MockMessage:
			content = '{"elementId": "1", "method": "click", "arguments": []}'
		class MockChoice:
			message = MockMessage()
		class MockResponse:
			choices = [MockChoice()]
			
		mock_completion.return_value = MockResponse()
		
		action_id = "Test Action"
		instruction = "click login"
		dom_tree = "[1] button 'Login'"
		
		# Mock Frappe docs
		class MockAction:
			model = "Test Model"
		class MockModel:
			model_name = "test-model"
			api_base = None
			api_version = None
			temperature = 0.0
			max_tokens = 1024
			def get_password(self, field):
				return "test-key"
				
		mock_get_doc.side_effect = [MockAction(), MockModel()]
		
		res = infer_action(action_id, instruction, dom_tree)
		
		self.assertEqual(res.get("elementId"), "1")
		self.assertEqual(res.get("method"), "click")
		mock_completion.assert_called_once()
