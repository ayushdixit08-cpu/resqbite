from rest_framework.views import exception_handler


def api_exception_handler(exc, context):
    response = exception_handler(exc, context)
    if response is None:
        return None

    detail = response.data
    if isinstance(detail, dict) and "detail" in detail:
        message = str(detail["detail"])
        errors = None
    else:
        message = "Validation failed." if response.status_code == 400 else "Request failed."
        errors = detail

    response.data = {
        "success": False,
        "message": message,
        "errors": errors,
    }
    return response
