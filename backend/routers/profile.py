from fastapi import APIRouter, HTTPException, Body
import uuid
import time
from backend_unified.models.schemas import ChatMessage, ProfileSessionState, PsychologicalReport
from backend_unified.services.profile_service import agent, profile_sessions

router = APIRouter()

@router.post("/start", response_model=ProfileSessionState)
async def start_profile_session():
    """Initializes a new conversational profiling session."""
    session_id = str(uuid.uuid4())
    first_msg = await agent.get_next_question([])
    
    new_session = ProfileSessionState(
        session_id=session_id,
        history=[ChatMessage(role="assistant", content=first_msg, timestamp=time.time())]
    )
    profile_sessions[session_id] = new_session
    return new_session

@router.post("/chat", response_model=ProfileSessionState)
async def chat(session_id: str, message: str = Body(..., embed=True)):
    """Sends a user message and gets a dynamic follow-up."""
    if session_id not in profile_sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session = profile_sessions[session_id]
    session.history.append(ChatMessage(role="user", content=message, timestamp=time.time()))
    
    ai_response_text = await agent.get_next_question(session.history)
    session.history.append(ChatMessage(role="assistant", content=ai_response_text, timestamp=time.time()))
    
    return session

@router.patch("/edit", response_model=ProfileSessionState)
async def edit_message(session_id: str, index: int, new_content: str = Body(..., embed=True)):
    """Updates a previous USER message by index and re-triggers the next AI turn."""
    if session_id not in profile_sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session = profile_sessions[session_id]
    if index >= len(session.history) or session.history[index].role != "user":
        raise HTTPException(status_code=400, detail="Invalid message index")

    session.history[index].content = new_content
    
    ai_response_text = await agent.get_next_question(session.history)
    session.history.append(ChatMessage(role="assistant", content=ai_response_text, timestamp=time.time()))
    
    return session

@router.post("/rewind", response_model=ProfileSessionState)
async def rewind(session_id: str, index: int):
    """Truncates conversation history back to a specific index."""
    if session_id not in profile_sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session = profile_sessions[session_id]
    if index < 0 or index >= len(session.history):
        raise HTTPException(status_code=400, detail="Invalid index")
    
    session.history = session.history[:index + 1]
    return session

@router.get("/report")
async def get_report(session_id: str):
    """Synthesizes the entire history into a final JSON report."""
    if session_id not in profile_sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session = profile_sessions[session_id]
    if len(session.history) < 2:
        raise HTTPException(status_code=400, detail="Not enough data for a report. Chat more first.")
    
    try:
        report = await agent.generate_report(session.history)
        session.is_complete = True
        return report
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Report generation failed: {str(e)}")
