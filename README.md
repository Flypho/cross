Żeby uruchomić najlepiej użyć Linuksa (jak ktoś ni ma to polecam maszynę wirtualną -> sam używałem Minta (Ubuntu)
1. Zainstalować gita -> dacie radę
2. Zainstalować nodejsa -> sudo apt-get install -y nodejs
3. Zainstalować mongoDB -> https://www.mongodb.com/download-center?jmp=nav#community
4. Krok opcjonalny, jeśli ktoś chce podejrzeć stan bazy danych inaczej niż w konsoli -> zainstalować Robo 3T https://robomongo.org/
5. Jak już wszystko poinstalowane to klonujemy sobie repo do dowolnego katalogu (git clone)
6. Otwieramy 3 konsole, w pierwszej -> sudo mongod
w drugiej -> sudo mongo
w trzeciej -> przechodzimy do katalogu z naszym projektem do lokalizacji w której znajduje się plik server.js i wywołujemy node server.js
Apka działa pod localhost:3000, można się rejestrować i odpalać ją.
Jak komuś wyskakuje błąd nr 100 po wpisaniu sudo mongod to można takiej opcji próbować:
mkdir -p /data/db
