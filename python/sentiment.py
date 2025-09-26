import sys
from textblob import TextBlob

description = sys.argv[1]
language = sys.argv[2] if len(sys.argv) > 2 else 'en'

blob = TextBlob(description)
sentiment = blob.sentiment.polarity

print(abs(sentiment) if sentiment < 0 else 0)