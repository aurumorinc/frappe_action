import frappe

def before_uninstall():
    client_name = "Orbit"
    client_id = frappe.db.get_value("OAuth Client", {"app_name": client_name}, "name")
    
    if client_id:
        # Clean up associated tokens
        tokens = frappe.get_all("OAuth Bearer Token", filters={"client": client_id})
        for token in tokens:
            frappe.delete_doc("OAuth Bearer Token", token.name, ignore_permissions=True, force=True)
        
        # Delete the OAuth Client
        frappe.delete_doc("OAuth Client", client_id, ignore_permissions=True, force=True)
