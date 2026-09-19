# Auth Testing Playbook

Step 1: MongoDB Verification
```
mongosh
use test_database
db.users.find({role: "admin"}).pretty()
db.users.findOne({role: "admin"}, {password_hash: 1})
```
Verify: bcrypt hash starts with `$2b$`, indexes exist on users.email (unique), login_attempts.identifier.

Step 2: API Testing
```
curl -c cookies.txt -X POST http://localhost:8001/api/auth/login -H "Content-Type: application/json" -d '{"email":"mrsalbertyadav@gmail.com","password":"Admin@1234"}'
cat cookies.txt
curl -b cookies.txt http://localhost:8001/api/auth/me
# Bearer variant
TOKEN=$(curl -s -X POST http://localhost:8001/api/auth/login -H "Content-Type: application/json" -d '{"email":"collector@nullset.dev","password":"Collector@123"}' | python3 -c "import sys,json;print(json.load(sys.stdin)['token'])")
curl http://localhost:8001/api/auth/me -H "Authorization: Bearer $TOKEN"
```

Login returns `{token, user}` and sets `access_token` cookie. `/me` returns the same user via cookie or Bearer.
Brute force: 5 failed logins for same ip:email -> 429 for 15 minutes.
