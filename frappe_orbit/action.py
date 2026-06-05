import frappe
from frappe import _

@frappe.whitelist()
def get(name):
    if not frappe.db.exists("Action", name):
        frappe.throw(_("Action {0} not found").format(name))
        
    action = frappe.get_doc("Action", name)
    return action.as_dict()
