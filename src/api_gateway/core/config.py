from pydantic_settings import BaseSettings
from pydantic import ConfigDict

class Settings(BaseSettings):
    database_url: str
    jwt_secret: str
    jwt_algorithm: str
    admin_emails_csv: str = ""

    model_config = ConfigDict(from_attributes=True)

settings = Settings()
