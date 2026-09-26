import json
import os

from dotenv import load_dotenv
from groq import Groq

from app.ai.prompts import EXTRACTION_PROMPT


load_dotenv()

client = Groq(
    api_key=os.getenv("GROQ_API_KEY")
)


def extract_deviation_fields(text: str) -> dict:

    if not os.getenv("GROQ_API_KEY"):
        raise ValueError("GROQ_API_KEY is not configured.")

    prompt = EXTRACTION_PROMPT.format(text=text)

    response = client.chat.completions.create(
        model="openai/gpt-oss-120b",
        messages=[
            {
                "role": "user",
                "content": prompt
            }
        ],
        temperature=0,
        response_format={
            "type": "json_object"
        }
    )

    content = response.choices[0].message.content

    if not content:
        raise ValueError("Groq returned an empty response.")

    return json.loads(content)