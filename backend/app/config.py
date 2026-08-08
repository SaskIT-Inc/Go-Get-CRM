from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+asyncpg://gogetcrm:gogetcrm@localhost:5432/gogetcrm"

    # "development" (default, safe for local/dev boxes) or "production" — see
    # main.py's startup check, which refuses to boot in production with the
    # default jwt_secret below still in place.
    app_env: str = "development"
    log_level: str = "INFO"

    jwt_secret: str = "change-me-to-a-long-random-string"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 1440

    cors_origins: str = "http://localhost:5173"

    upload_dir: str = "./uploads"
    upload_base_url: str = "http://localhost:8070/uploads"

    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from: str = "no-reply@gogetcrm.local"
    smtp_from_name: str = "GOGET CRM"
    smtp_use_tls: bool = True

    # Microsoft Graph (Mail.Send, application permission) — preferred sender
    # when configured, since Microsoft 365 tenants with Security Defaults on
    # block basic-auth SMTP entirely. Leave any of these blank to fall back
    # to the SMTP settings above.
    graph_tenant_id: str = ""
    graph_client_id: str = ""
    graph_client_secret: str = ""

    @property
    def graph_configured(self) -> bool:
        return bool(self.graph_tenant_id and self.graph_client_id and self.graph_client_secret)

    # Google OAuth (per-user "Connect your Gmail" — Settings > Email, delegated
    # gmail.send, distinct from the Graph service-account sender above). Each
    # staff user connects their own account; unset users keep sending through
    # the platform sender via adapters/email.py, so this is purely additive.
    google_client_id: str = ""
    google_client_secret: str = ""
    google_oauth_redirect_uri: str = "http://localhost:8070/api/integrations/google/callback"

    @property
    def google_configured(self) -> bool:
        return bool(self.google_client_id and self.google_client_secret)

    # Microsoft per-user OAuth ("Connect your OneDrive" and "Connect your
    # Outlook" — both in Settings > Email, both delegated permissions,
    # both distinct from the graph_* app-only mail sender above). One Azure
    # AD App Registration covers both connectors (add Files.ReadWrite,
    # Mail.Send, offline_access, and User.Read as delegated permissions on
    # it) using the "common" authority so both personal Microsoft accounts
    # and work/school (Azure AD) accounts can connect. Each staff member or
    # client connects their own account; nothing here is required for the
    # rest of the app to function.
    microsoft_client_id: str = ""
    microsoft_client_secret: str = ""
    onedrive_redirect_uri: str = "http://localhost:8070/api/integrations/onedrive/callback"
    outlook_redirect_uri: str = "http://localhost:8070/api/integrations/outlook/callback"

    @property
    def microsoft_oauth_configured(self) -> bool:
        return bool(self.microsoft_client_id and self.microsoft_client_secret)

    # Symmetric key (Fernet) used to encrypt OAuth refresh/access tokens at
    # rest (see app/security/crypto.py). Unlike jwt_secret this must be able
    # to decrypt what it encrypts, so it's a separate key, not reused.
    encryption_key: str = ""

    # Signup email verification is sent as the SaaS platform owner (Go-Get
    # Inc.), not as the generic smtp_from address — every other transactional
    # email (invites, appointment confirmations, etc.) keeps using smtp_from.
    verification_from_email: str = "info@go-get.ca"
    verification_code_expire_minutes: int = 30

    groq_api_key: str = ""
    groq_base_url: str = "https://api.groq.com/openai/v1"
    groq_model: str = "llama-3.3-70b-versatile"

    seed_admin_email: str = "admin@gogetcrm.local"
    seed_admin_password: str = "change-me-please"

    contact_inbox_email: str = "hello@gogetcrm.ca"

    # Used to build invite/verification-email redirect links.
    frontend_base_url: str = "http://localhost:5173"

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


settings = Settings()
