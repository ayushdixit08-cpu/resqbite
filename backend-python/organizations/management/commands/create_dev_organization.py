import secrets

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from accounts.models import User
from organizations.models import Organization


class Command(BaseCommand):
    help = "Create one explicitly requested, development-only verified organization."

    def add_arguments(self, parser):
        parser.add_argument("--email", required=True)
        parser.add_argument("--name", required=True)
        parser.add_argument("--address", default="Development-only receiving address")

    def handle(self, *args, **options):
        if not settings.DEBUG:
            raise CommandError("This command is available only when DEBUG=True.")

        email = options["email"].strip().casefold()
        if not email.endswith("@example.test"):
            raise CommandError("Use a reserved @example.test address for development accounts.")
        if User.objects.filter(email__iexact=email).exists():
            raise CommandError("That email already belongs to an account; no data was changed.")

        password = secrets.token_urlsafe(32)
        with transaction.atomic():
            user = User.objects.create_user(
                email=email,
                name="Development test organization",
                password=password,
                role=User.ROLE_NGO,
                is_verified=True,
            )
            organization = Organization.objects.create(
                user=user,
                name=f"[DEVELOPMENT TEST] {options['name'].strip()}",
                address=options["address"].strip(),
                verification_status=Organization.VERIFICATION_VERIFIED,
            )

        self.stdout.write(self.style.SUCCESS(
            f"Created development-only verified organization {organization.id}."
        ))
        self.stdout.write(f"Login email: {email}")
        self.stdout.write(f"One-time password: {password}")
        self.stdout.write(
            "Remove it after testing with: "
            f"python manage.py delete_dev_organization --email {email} --confirm"
        )
