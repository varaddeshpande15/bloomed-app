from typing import List, Optional
import uuid
import json
from groq import Groq
from backend_unified.config import settings
from backend_unified.models.schemas import Question
from backend_unified.utils.logger import get_logger

logger = get_logger("question_service")

class StaticQuestionBank:
    """Lightweight Fallback Mode"""
    ...
    fallback_questions = {
        "Probability": [
            Question(
                id=f"q_{uuid.uuid4().hex[:8]}",
                topic="Probability",
                difficulty="easy",
                type="conceptual",
                question_text="What is conditional probability?",
                options=["P(A|B)", "P(A+B)", "P(A)", "P(B)"],
                correct_answer="P(A|B)",
                explanation="Conditional probability is the probability of an event given another event has occurred."
            )
        ]
    }

    @classmethod
    def get_question(cls, topic: str, difficulty: str, q_type: str) -> Question:
        return cls.fallback_questions.get(topic, [cls.fallback_questions["Probability"][0]])[0]


def generate_question(
    topic: str,
    difficulty: str,
    q_type: str,
    concept: str,
    bloom_level: str = "understand",
    style: str = "standard",
    avoid_similar: Optional[List[str]] = None,
) -> Question:
    """
    Generates a question using Groq LLM based on strategy parameters.
    """
    logger.info(f"Generating question for Topic: {topic}, Concept: {concept}, Difficulty: {difficulty}")
    try:
        if not settings.GROQ_API_KEY:
            raise ValueError("No GROQ key")
            
        client = Groq(api_key=settings.GROQ_API_KEY)
        
        avoid_block = ""
        if avoid_similar:
            snippets = [s[:180].replace('"', "'") for s in avoid_similar[-6:] if s]
            if snippets:
                avoid_block = (
                    "\nIMPORTANT: Do NOT repeat or closely paraphrase these earlier question stems "
                    "(write a clearly different scenario and wording):\n- "
                    + "\n- ".join(snippets)
                )

        prompt = f"""You are an expert test creator constructing a question mapped exactly to the Bloom Taxonomy level of '{bloom_level.upper()}'.
        Target Student Learning Style: {style.upper()}. Adapt the framing to match this style (e.g., visual=scenarios, auditory=dialogue, etc.).
        
        Generate a {difficulty} {q_type} question about '{concept}' in the topic '{topic}'.{avoid_block}
        Output MUST be valid JSON exactly following:
        {{
            "question_text": "The question?",
            "options": ["A", "B", "C", "D"],
            "correct_answer": "exactly matching one option",
            "explanation": "Why it is correct"
        }}
        """
        
        response = client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model="llama-3.3-70b-versatile",
            response_format={"type": "json_object"}
        )
        
        data = json.loads(response.choices[0].message.content)
        
        return Question(
            id=f"q_{uuid.uuid4().hex[:8]}",
            topic=topic,
            difficulty=difficulty,
            type=q_type,
            question_text=data.get("question_text", "Error text?"),
            options=data.get("options", []),
            correct_answer=data.get("correct_answer", ""),
            explanation=data.get("explanation", "")
        )

    except Exception as e:
        logger.error(f"Failed to generate question: {e}. Falling back.")
        return StaticQuestionBank.get_question(topic, difficulty, q_type)
