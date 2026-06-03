import React, { useState, useEffect } from "react";
import { domObserver } from "./lib/dom_observer";

// --- Background Listeners ---
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "START_DOM_OBSERVER") {
    domObserver(message.payload).then((result) => {
      if (result.success) {
        chrome.runtime.sendMessage({
          type: "DOM_OBSERVER_RESULT",
          payload: result.value
        });
      }
    });
  }
});

window.addEventListener("ORBIT_START_HEADLESS_ACTION", (event: Event) => {
  const customEvent = event as CustomEvent;
  const actionName = customEvent.detail?.action_name;
  
  if (actionName) {
    console.log("Headless bot requested action:", actionName);
  }
});

// --- UI Component ---
export default function OrbitCoPilot() {
  const [todos, setTodos] = useState<any[]>([]);
  const [activeTodo, setActiveTodo] = useState<any | null>(null);
  const [subTasks, setSubTasks] = useState<any[]>([]);

  // Mock data for demonstration
  useEffect(() => {
    setTodos([
      { id: "TODO-001", title: "Enrich Lead Data", completed: false },
      { id: "TODO-002", title: "Verify Contact Info", completed: false }
    ]);
  }, []);

  const handleTodoClick = (todo: any) => {
    setActiveTodo(todo);
    // Mock sub-tasks based on the action nodes
    setSubTasks([
      { id: "node_1", title: "Find Email Address", completed: true, type: "dom_observer" },
      { id: "node_2", title: "Verify LinkedIn Profile", completed: false, type: "manual-step" }
    ]);
  };

  const handleMarkCompleted = () => {
    if (activeTodo) {
      // Call submit_task_data API here
      console.log("Marking completed:", activeTodo.id);
      setActiveTodo(null);
      setSubTasks([]);
    }
  };

  const handleReset = () => {
    console.log("Resetting task state");
    // Reset engine state
  };

  const completedCount = todos.filter(t => t.completed).length;
  const totalCount = todos.length;
  const percentage = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);

  return (
    <div style={{
      position: "fixed",
      bottom: "20px",
      right: "20px",
      width: "320px",
      backgroundColor: "white",
      boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
      borderRadius: "8px",
      padding: "16px",
      fontFamily: "system-ui, sans-serif",
      zIndex: 999999
    }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "16px" }}>
        <div style={{ fontSize: "16px", fontWeight: 500 }}>
          Orbit Co-Pilot
        </div>
        <div style={{ fontSize: "14px", color: "#666" }}>
          {completedCount}/{totalCount} tasks completed
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
        <span style={{ 
          backgroundColor: percentage === 100 ? "#e6f4ea" : "#fff3e0", 
          color: percentage === 100 ? "#1e8e3e" : "#e65100",
          padding: "4px 8px",
          borderRadius: "12px",
          fontSize: "12px",
          fontWeight: 500
        }}>
          {percentage}% completed
        </span>
        <div style={{ display: "flex", gap: "8px" }}>
          <button onClick={handleReset} style={btnStyle}>Reset</button>
          {activeTodo && (
            <button onClick={handleMarkCompleted} style={btnStyle}>Mark completed</button>
          )}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "200px", overflowY: "auto" }}>
        {!activeTodo ? (
          todos.map(todo => (
            <div 
              key={todo.id} 
              onClick={() => handleTodoClick(todo)}
              style={{
                padding: "8px",
                borderRadius: "4px",
                cursor: "pointer",
                backgroundColor: "#f8f9fa",
                display: "flex",
                alignItems: "center",
                gap: "8px"
              }}
            >
              <span style={{ textDecoration: todo.completed ? "line-through" : "none", color: todo.completed ? "#999" : "#333" }}>
                {todo.title}
              </span>
            </div>
          ))
        ) : (
          <div>
            <div style={{ fontSize: "12px", fontWeight: "bold", marginBottom: "8px", color: "#666" }}>
              Sub-tasks for: {activeTodo.title}
            </div>
            {subTasks.map(task => (
              <div 
                key={task.id} 
                style={{
                  padding: "8px",
                  borderRadius: "4px",
                  backgroundColor: "#f8f9fa",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  marginBottom: "4px"
                }}
              >
                <span style={{ textDecoration: task.completed ? "line-through" : "none", color: task.completed ? "#999" : "#333" }}>
                  {task.title}
                </span>
                {task.type === "manual-step" && !task.completed && (
                  <span style={{ fontSize: "10px", backgroundColor: "#e8f0fe", color: "#1967d2", padding: "2px 4px", borderRadius: "4px", marginLeft: "auto" }}>
                    Manual
                  </span>
                )}
              </div>
            ))}
            <button onClick={() => setActiveTodo(null)} style={{ ...btnStyle, marginTop: "8px", width: "100%" }}>
              Back to Tasks
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const btnStyle = {
  background: "transparent",
  border: "none",
  color: "#1a73e8",
  cursor: "pointer",
  fontSize: "12px",
  fontWeight: 500,
  padding: "4px 8px"
};
