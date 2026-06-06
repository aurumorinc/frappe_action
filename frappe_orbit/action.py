import frappe
from frappe import _

@frappe.whitelist()
def get(name):
    if not frappe.db.exists("Action", name):
        frappe.throw(_("The requested action '{0}' could not be found.").format(name))
        
    action = frappe.get_doc("Action", name)
    return action.as_dict()
