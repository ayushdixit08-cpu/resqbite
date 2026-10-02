from rest_framework.response import Response


def success_response(data, message="Request completed successfully.", status=200):
    return Response(
        {"success": True, "message": message, "data": data},
        status=status,
    )
