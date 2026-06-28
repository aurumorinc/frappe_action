import frappe
from frappe_action.action.doctype.action_settings.action_settings import get_or_create_oauth_client

def after_install():
    # Create the hidden OAuth Client for Action
    get_or_create_oauth_client()
