"""
Verification script for the RAG Chatbot.
"""

import asyncio
import logging
import sys
import os

# Add project root to path
sys.path.append(os.getcwd())

from step5_llm_intelligence.chat_service import ChatService

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def test_chatbot(query: str):
    chat_service = ChatService()
    
    logger.info(f"User Query: '{query}'")
    logger.info("Generating response (this may take a few seconds)...")
    
    response = await chat_service.get_chat_response(query)
    
    print("\n" + "="*50)
    print(f"AI RESPONSE:\n{response['answer']}")
    print("="*50)
    print("\nSOURCES USED:")
    for i, source in enumerate(response['sources']):
        print(f"{i+1}. {source['title']} (Score: {source['score']:.4f})")
    print("="*50 + "\n")

async def main():
    # Test query related to our mock news
    await test_chatbot("What happened to Bitcoin price recently and why?")
    
    # Test query about Solana outage
    await test_chatbot("Why did Solana network go offline?")

if __name__ == "__main__":
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
    
    try:
        asyncio.run(main())
    except Exception as e:
        logger.error(f"Verification failed: {e}")
