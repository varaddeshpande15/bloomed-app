from fastapi import APIRouter
from backend.models.schemas import TestPlanRequest, TestPlanResponse
from backend.services.plan_service import generate_test_plan

router = APIRouter()

@router.post("/generate-test-plan", response_model=TestPlanResponse)
def create_test_plan(request: TestPlanRequest):
    """
    Generates a non-adaptive foundational bounding test plan mapping counts and constraints.
    """
    return generate_test_plan(request)
