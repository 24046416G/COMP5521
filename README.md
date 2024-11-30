Start naivecoin： 
```
cd naivecoin 
```
```
npm install 
```
```
start first node: node ./bin/naivecoin.js -p 3001 --name 1 
```
```
start second node: node bin/naivecoin.js -p 3002 --name 2 --peers http://localhost:3001
```

Start Frontend：
```
cd frontend 
```
```
npm install 
```
```
npm run dev
```