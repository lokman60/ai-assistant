from typing import ClassVar, List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "AI Document Assistant"
    debug: bool = False

    database_url: str = "sqlite:///./data/ai_docs.db"
    jwt_secret: str = "super-secret-key-change-in-production"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_minutes: int = 10080

    upload_dir: str = "uploads"
    max_upload_size_mb: int = 50
    allowed_extensions: List[str] = [".pdf"]

    llm_provider: str = "openrouter"
    llm_base_url: str = "http://localhost:8080/v1"
    llm_model: str = "2"
    llm_timeout: int = 300

    openrouter_api_key: str = ""
    openrouter_base_url: str = "https://openrouter.ai/api/v1"
    openrouter_model: str = "meta-llama/llama-3.3-70b-instruct"

    embedding_model: str = "sentence-transformers/all-MiniLM-L6-v2"
    embedding_dim: int = 1536
    chunk_size: int = 500
    chunk_overlap: int = 100
    top_k: int = 5

    cors_origins: str = "http://localhost:5173,http://localhost:3000"

    @property
    def cors_origins_list(self) -> List[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
