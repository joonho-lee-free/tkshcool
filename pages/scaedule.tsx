import firebase_admin
from firebase_admin import credentials, firestore
import pandas as pd

# Initialize Firebase Admin SDK using the uploaded JSON file
def initialize_firestore():
    try:
        firebase_admin.get_app()
    except ValueError:
        cred = credentials.Certificate('firebase-key.json')
        firebase_admin.initialize_app(cred)
    return firestore.client()

# Fetch all documents in the 'school' collection and return a DataFrame
def fetch_school_data():
    db = initialize_firestore()
    docs = db.collection('school').stream()

    data = []
    for doc in docs:
        doc_id = doc.id
        fields = doc.to_dict()

        data.append({
            '문서ID': doc_id,
            '연월': fields.get('연월', ''),
            '발주처': fields.get('발주처', ''),
            '낙찰기업': fields.get('낙찰기업', ''),
            'no': fields.get('no', ''),
            '식품명': fields.get('식품명', ''),
            '규격': fields.get('규격', ''),
            '수량': fields.get('수량', ''),
            '계약단가': fields.get('계약단가', ''),
            '총합계약단가': fields.get('총합계약단가', ''),
            '속성정보': fields.get('속성정보', ''),
            '총량': fields.get('총량', ''),
            '납품일자': fields.get('납품일자', ''),
            '계산서번호': fields.get('계산서번호', '')
        })

    df = pd.DataFrame(data)
    return df

# Display table with a structure similar to schedule.tsx

def display_table_by_schedule(df):
    df_sorted = df.sort_values(['연월', '발주처', 'no'])
    print(df_sorted.to_string(index=False))

if __name__ == '__main__':
    df_school = fetch_school_data()
    display_table_by_schedule(df_school)

    # Fix for schedule.tsx error:
    # Original: .join(`
    # Corrected: .join('\n');
    # Explanation: Close the string properly with single quotes and semicolon to avoid unterminated string literal error.
