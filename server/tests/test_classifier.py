from app.services.classifier import classify_category, classify_workplace


def test_classifies_software_roles_as_technology() -> None:
    assert classify_category("Senior Backend Developer") == "technology"


def test_classifies_support_roles() -> None:
    assert classify_category("IT Support Analyst") == "support"


def test_hybrid_has_precedence_over_remote_keyword() -> None:
    assert classify_workplace("Hybrid role with occasional remote work") == "hybrid"


def test_remote_flag_is_respected() -> None:
    assert classify_workplace("Software Engineer", remote_flag=True) == "remote"
