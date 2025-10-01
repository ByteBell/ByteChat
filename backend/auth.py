from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
import os
from typing import Optional

class GmailAuth:
    def __init__(self, client_id: str, client_secret: str, redirect_uri: str = None):
        self.client_id = client_id
        self.client_secret = client_secret
        self.redirect_uri = redirect_uri or 'http://localhost:8000/auth/callback'
        self.scopes = [
            'https://www.googleapis.com/auth/gmail.readonly',
            'https://www.googleapis.com/auth/userinfo.email',
            'https://www.googleapis.com/auth/userinfo.profile'
        ]

    def get_authorization_url(self) -> str:
        """Generate the authorization URL for OAuth flow"""
        flow = Flow.from_client_config(
            {
                "web": {
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                    "redirect_uris": [self.redirect_uri]
                }
            },
            scopes=self.scopes
        )
        flow.redirect_uri = self.redirect_uri

        authorization_url, _ = flow.authorization_url(
            access_type='offline',
            include_granted_scopes='true'
        )

        return authorization_url

    def exchange_code_for_tokens(self, code: str) -> dict:
        """Exchange authorization code for access tokens"""
        flow = Flow.from_client_config(
            {
                "web": {
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                    "redirect_uris": [self.redirect_uri]
                }
            },
            scopes=self.scopes
        )
        flow.redirect_uri = self.redirect_uri

        flow.fetch_token(code=code)

        credentials = flow.credentials

        return {
            'access_token': credentials.token,
            'refresh_token': credentials.refresh_token,
            'expires_in': credentials.expiry.timestamp() if credentials.expiry else None
        }

    def verify_access_token(self, access_token: str) -> Optional[dict]:
        """Verify access token and get user info"""
        try:
            import requests

            print(f"Verifying token (first 20 chars): {access_token[:20]}...")
            print(f"Token length: {len(access_token)}")

            # Use Google's userinfo endpoint directly without credentials object
            response = requests.get(
                'https://www.googleapis.com/oauth2/v2/userinfo',
                headers={'Authorization': f'Bearer {access_token}'}
            )

            print(f"Response status: {response.status_code}")

            if response.status_code != 200:
                print(f"Token verification failed: {response.status_code} - {response.text}")

                # Try tokeninfo endpoint as alternative
                print("Trying tokeninfo endpoint...")
                token_info_response = requests.get(
                    f'https://oauth2.googleapis.com/tokeninfo?access_token={access_token}'
                )
                print(f"Tokeninfo response: {token_info_response.status_code} - {token_info_response.text}")

                return None

            user_info = response.json()
            print(f"Successfully verified token for user: {user_info.get('email')}")

            return {
                'email': user_info.get('email'),
                'name': user_info.get('name'),
                'picture': user_info.get('picture'),
                'verified_email': user_info.get('verified_email', False)
            }
        except Exception as e:
            print(f"Token verification failed: {e}")
            import traceback
            traceback.print_exc()
            return None

    def get_gmail_service(self, access_token: str, refresh_token: str = None):
        """Get Gmail service instance"""
        credentials = Credentials(
            token=access_token,
            refresh_token=refresh_token,
            client_id=self.client_id,
            client_secret=self.client_secret
        )

        return build('gmail', 'v1', credentials=credentials)

    def get_user_emails(self, access_token: str, refresh_token: str = None, max_results: int = 10):
        """Fetch user's Gmail messages"""
        try:
            service = self.get_gmail_service(access_token, refresh_token)

            # Get list of messages
            results = service.users().messages().list(
                userId='me',
                maxResults=max_results
            ).execute()

            messages = results.get('messages', [])

            email_data = []
            for message in messages:
                msg = service.users().messages().get(
                    userId='me',
                    id=message['id']
                ).execute()

                headers = msg['payload'].get('headers', [])
                subject = next((h['value'] for h in headers if h['name'] == 'Subject'), 'No Subject')
                sender = next((h['value'] for h in headers if h['name'] == 'From'), 'Unknown Sender')
                date = next((h['value'] for h in headers if h['name'] == 'Date'), 'Unknown Date')

                email_data.append({
                    'id': message['id'],
                    'subject': subject,
                    'sender': sender,
                    'date': date,
                    'snippet': msg.get('snippet', '')
                })

            return email_data
        except Exception as e:
            print(f"Failed to fetch emails: {e}")
            return []