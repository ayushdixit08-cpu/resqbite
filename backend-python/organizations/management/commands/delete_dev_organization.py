from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from accounts.models import User


class Command(BaseCommand):
    help = "Delete an explicitly identified development-only organization account."

    def add_arguments(self, parser):
        parser.add_argument("--email", required=True)
        parser.add_argument("--confirm", action="store_true")

    def handle(self, *args, **options):
        if not settings.DEBUG:
            raise CommandError("This command is available only when DEBUG=True.")
        if not options["confirm"]:
            raise CommandError("Pass --confirm to delete the development organization.")

        email = options["email"].strip().casefold()
        if not email.endswith("@example.test"):
            raise CommandError("Only reserved @example.test development accounts can be deleted.")

        user = User.objects.filter(email__iexact=email, role=User.ROLE_NGO).first()
        if user is None:
            raise CommandError("No matching development organization account was found.")
        organization = getattr(user, "organization", None)
        if organization is None or not organization.name.startswith("[DEVELOPMENT TEST] "):
            raise CommandError("The account is not marked as a development test organization.")
        if organization.donations.exists() or organization.donation_requests.exists():
            raise CommandError(
                "The organization still has donations or requests. "
                "Remove only the test records first, then retry."
            )

        with transaction.atomic():
            user.delete()
        self.stdout.write(self.style.SUCCESS(
            f"Deleted development-only organization account {email}."
        ))
