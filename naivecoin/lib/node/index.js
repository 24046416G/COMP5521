const superagent = require('superagent');
const Block = require('../blockchain/block');
const Blocks = require('../blockchain/blocks');
const Transactions = require('../blockchain/transactions');
const R = require('ramda');

class Node {
    constructor(host, port, peers, blockchain) {
        this.host = host;
        this.port = port;
        this.peers = [];
        this.blockchain = blockchain;
        this.hookBlockchain();
        this.connectToPeers(peers);
    }

    hookBlockchain() {
        // Hook blockchain so it can broadcast blocks or transactions changes
        this.blockchain.emitter.on('blockAdded', (block) => {
            this.broadcast(this.sendLatestBlock, block);
        });

        this.blockchain.emitter.on('transactionAdded', (newTransaction) => {
            this.broadcast(this.sendTransaction, newTransaction);
        });

        this.blockchain.emitter.on('blockchainReplaced', (blocks) => {
            this.broadcast(this.sendLatestBlock, R.last(blocks));
        });
    }

    connectToPeer(newPeer) {
        this.connectToPeers([newPeer]);
        return newPeer;
    }

    connectToPeers(newPeers) {
        // Connect to every peer
        let me = `http://${this.host}:${this.port}`;
        newPeers.forEach((peer) => {            
            // If it already has that peer, ignore.
            if (!this.peers.find((element) => { return element.url == peer.url; }) && peer.url != me) {
                this.sendPeer(peer, { url: me });
                console.info(`Peer ${peer.url} added to connections.`);
                this.peers.push(peer);
                this.initConnection(peer);
                this.broadcast(this.sendPeer, peer);
            } else {
                console.info(`Peer ${peer.url} not added to connections, because I already have.`);
            }
        }, this);

    }

    initConnection(peer) {
        // It initially gets the latest block and all pending transactions
        this.getLatestBlock(peer);
        this.getTransactions(peer);
    }

    sendPeer(peer, peerToSend) {
        const URL = `${peer.url}/node/peers`;
        console.info(`Sending ${peerToSend.url} to peer ${URL}.`);
        return superagent
            .post(URL)
            .send(peerToSend)
            .catch((err) => {
                console.warn(`Unable to send me to peer ${URL}: ${err.message}`);
            });
    }

    getLatestBlock(peer) {
        const URL = `${peer.url}/blockchain/blocks/latest`;
        let self = this;
        console.info(`Getting latest block from: ${URL}`);
        return superagent
            .get(URL)
            .then((res) => {
                // Check for what to do with the latest block
                self.checkReceivedBlock(Block.fromJson(res.body));
            })
            .catch((err) => {
                console.warn(`Unable to get latest block from ${URL}: ${err.message}`);
            });
    }

    sendLatestBlock(peer, block) {
        const URL = `${peer.url}/blockchain/blocks/latest`;
        console.info(`Posting latest block to: ${URL}`);
        return superagent
            .put(URL)
            .send(block)
            .catch((err) => {
                console.warn(`Unable to post latest block to ${URL}: ${err.message}`);
            });
    }

    getBlocks(peer) {
        const URL = `${peer.url}/blockchain/blocks`;
        let self = this;
        console.info(`Getting blocks from: ${URL}`);
        return superagent
            .get(URL)
            .then((res) => {
                // Check for what to do with the block list
                self.checkReceivedBlocks(Blocks.fromJson(res.body));
            })
            .catch((err) => {
                console.warn(`Unable to get blocks from ${URL}: ${err.message}`);
            });
    }

    sendTransaction(peer, transaction) {
        const URL = `${peer.url}/blockchain/transactions`;
        console.info(`Sending transaction '${transaction.id}' to: '${URL}'`);
        return superagent
            .post(URL)
            .send(transaction)
            .catch((err) => {
                console.warn(`Unable to put transaction to ${URL}: ${err.message}`);
            });
    }

    getTransactions(peer) {
        const URL = `${peer.url}/blockchain/transactions`;
        let self = this;
        console.info(`Getting transactions from: ${URL}`);
        return superagent
            .get(URL)
            .then((res) => {
                self.syncTransactions(Transactions.fromJson(res.body));
            })
            .catch((err) => {
                console.warn(`Unable to get transations from ${URL}: ${err.message}`);
            });
    }

    getConfirmation(peer, transactionId) {
        // Get if the transaction has been confirmed in that peer
        const URL = `${peer.url}/blockchain/blocks/transactions/${transactionId}`;        
        console.info(`Getting transactions from: ${URL}`);
        return superagent
            .get(URL)
            .then(() => {
                return true;
            })
            .catch(() => {
                return false;
            });
    }

    getConfirmations(transactionId) {
        // Get from all peers if the transaction has been confirmed
        let foundLocally = this.blockchain.getTransactionFromBlocks(transactionId) != null ? true : false;
        return Promise.all(R.map((peer) => {
            return this.getConfirmation(peer, transactionId);
        }, this.peers))
            .then((values) => {
                return R.sum([foundLocally, ...values]);
            });
    }

    broadcast(fn, ...args) {
        // Call the function for every peer connected
        console.info('Broadcasting');
        this.peers.map((peer) => {
            fn.apply(this, [peer, ...args]);
        }, this);
    }

    syncTransactions(transactions) {
        // For each received transaction check if we have it, if not, add.
        R.forEach((transaction) => {
            let transactionFound = this.blockchain.getTransactionById(transaction.id);

            if (transactionFound == null) {
                console.info(`Syncing transaction '${transaction.id}'`);
                this.blockchain.addTransaction(transaction);
            }
        }, transactions);
    }

    checkReceivedBlock(block) {
        return this.checkReceivedBlocks([block]);
    }

    checkReceivedBlocks(blocks) {
        // 按区块索引排序接收到的区块
        const receivedBlocks = blocks.sort((b1, b2) => (b1.index - b2.index));
        const latestBlockReceived = receivedBlocks[receivedBlocks.length - 1];
        const latestBlockHeld = this.blockchain.getLastBlock();

        // 打印日志以便调试
        console.info('Fork resolution:');
        console.info(`- Current chain height: ${latestBlockHeld.index}`);
        console.info(`- Received chain height: ${latestBlockReceived.index}`);

        // 如果接收到的链不比当前的长，不做任何处理
        if (latestBlockReceived.index <= latestBlockHeld.index) {
            console.info('Received chain is not longer than current chain. No action needed.');
            return false;
        }

        console.info(`Blockchain possibly behind. Current height: ${latestBlockHeld.index}, Received height: ${latestBlockReceived.index}`);

        // 检查是否可以直接添加新区块
        if (latestBlockHeld.hash === latestBlockReceived.previousHash) {
            console.info('Received block is direct successor. Appending to chain.');
            try {
                this.blockchain.addBlock(latestBlockReceived);
                return true;
            } catch (err) {
                console.error('Error adding block:', err);
                return false;
            }
        } 
        // 如果只收到一个区块，需要请求完整的区块链
        else if (receivedBlocks.length === 1) {
            console.info('Received single block. Requesting full chain.');
            this.broadcast(this.getBlocks);
            return null;
        } 
        // 处理分叉情况 - 简单地选择最长的链
        else {
            console.info('Fork detected. Comparing chain lengths...');
            
            try {
                // 验证接收到的链的基本有效性（不包括难度验证）
                this.validateChainBasics(receivedBlocks);
                
                // 比较链长度
                if (receivedBlocks.length > this.blockchain.getAllBlocks().length) {
                    console.info('Received chain is longer. Replacing current chain.');
                    // 直接替换链，不进行难度验证
                    this.replaceChain(receivedBlocks);
                    return true;
                } else {
                    console.info('Keeping current chain as it is equal or longer.');
                    return false;
                }
            } catch (err) {
                console.error('Error during fork resolution:', err);
                return false;
            }
        }
    }

    // 添加基本的链验证方法（不包括难度验证）
    validateChainBasics(blocks) {
        // 验证创世区块
        if (JSON.stringify(blocks[0]) !== JSON.stringify(Block.genesis)) {
            throw new Error('Invalid genesis block');
        }

        // 验证区块连接性
        for (let i = 1; i < blocks.length; i++) {
            const currentBlock = blocks[i];
            const previousBlock = blocks[i - 1];

            // 验证区块索引
            if (previousBlock.index + 1 !== currentBlock.index) {
                throw new Error(`Invalid block index at ${i}`);
            }

            // 验证前一个区块的哈希
            if (previousBlock.hash !== currentBlock.previousHash) {
                throw new Error(`Invalid previous hash at block ${i}`);
            }

            // 验证区块哈希
            if (currentBlock.hash !== currentBlock.toHash()) {
                throw new Error(`Invalid hash at block ${i}`);
            }
        }
    }

    // 添加替换链的方法
    replaceChain(newChain) {
        console.info('Replacing blockchain with received chain');
        
        // 获取新增的区块
        let newBlocks = R.takeLast(newChain.length - this.blockchain.blocks.length, newChain);
        
        // 将新区块的交易添加回交易池
        R.forEach((block) => {
            R.forEach((tx) => {
                this.blockchain.transactions.push(tx);
            }, block.transactions);
        }, newBlocks);

        // 更新区块链
        this.blockchain.blocks = newChain;
        this.blockchain.blocksDb.write(newChain);

        // 从交易池中移除已经包含在新区块中的交易
        R.forEach((block) => {
            this.blockchain.removeBlockTransactionsFromTransactions(block);
        }, newBlocks);

        this.blockchain.emitter.emit('blockchainReplaced', newBlocks);
    }
}

module.exports = Node;
