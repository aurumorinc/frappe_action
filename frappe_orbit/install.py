import frappe
from frappe_orbit.orbit.doctype.orbit_settings.orbit_settings import get_or_create_oauth_client

def after_install():
    # Create the hidden OAuth Client for Orbit
    get_or_create_oauth_client()
