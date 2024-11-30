Goals
• Basic blockchain system: Study the code of the naivecoin1 and understand how to construct a basic blockchain system. The Basic blockchain system should have the following components (already included in naivecoin).
    • the blockchain prototype.
    • mining and PoW algorithm
    • pay-to-public-key-hash (P2PKH) transactions implementation
    • Network
    • Storage and data persistence
    • Wallet and transaction management
• Enhanced functionality implementation. You need to implement two additional features based on the existing code.
    • Achieve dynamic dif􀏐iculty: Implement a mechanism to adjust the dif􀏐iculty level of block mining dynamically. This should be based on the time taken to generate the previous set of blocks (e.g., 10 or 20 blocks) similar to the approach used in Bitcoin or Ethereum.
    • Basic Fork Resolution: Develop a simple fork resolution mechanism. When two competing chains are detected, students could write logic to choose the longest or most dif􀏐icult chain.
• Student Attendance Application: A blockchain-based application supporting student check-in and querying attendance records. The system should have the following functions.
    • Student information registration: Each student generates a public key and a secret key, then registers their student ID along with the public key to the blockchain. Store your secret key in the wallet.
    • Attendance information recording: Students sign an attendance certi􀏐icate (including student ID, event ID, and timestamp) using their secret key, then record it to the blockchain.
    • Mint: Students (miners) should check if the signatures of the attendance records are correct; records with incorrect signatures cannot be packaged into the block. Students (miners) generating blocks receive additional rewards.
    • Record querying: Teachers can query about a speci􀏐ic student's attendance throughout the entire semester or several weeks, or the attendance list of a class.
    • Provide a good user interface.
    • The student attendance system should be implemented based on the code of naivecoin we provided.
You could refer to some open-source codes to implement your application. Note that you must refer to them in your report and ensure that code similarity with online sources does not exceed 10% (exclude naivecoin). Otherwise, it could be seen as plagiarism.

Start naivecoin：
cd naivecoin
npm install
start first node: node ./bin/naivecoin.js -p 3001 --name 1
start second node: node bin/naivecoin.js -p 3002 --name 2 --peers http://localhost:3001

start frontend
cd frontend
npm install
npm run dev