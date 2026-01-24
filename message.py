from flask import Flask, request, Response
from twilio.rest import Client
from twilio.twiml.messaging_response import MessagingResponse

import os

# TWILIO_ACCOUNT_SID = os.environ["TWILIO_ACCOUNT_SID"]
# TWILIO_AUTH_TOKEN = os.environ["TWILIO_AUTH_TOKEN"]

TWILIO_ACCOUNT_SID = "ACfc85ee69ba8d995855ca80ad1ea313b1"
TWILIO_AUTH_TOKEN = "b17e89c9c6a6113d3b3dddf9adec53cf"

client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)

app = Flask(__name__)

@app.route("/sms", methods=["POST"])
def sms_reply():
    from_number = request.values.get("From", "")
    to_number = request.values.get("To", "")
    body = request.values.get("Body", "")

    print("INCOMING SMS")
    print("From:", from_number)
    print("To:", to_number)
    print("Body:", body)

    resp = MessagingResponse()
    resp.message("Hello Kevin caco!")
    return str(resp)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)