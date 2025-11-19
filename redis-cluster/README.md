# Redis Cluster Configuration

High-availability Redis cluster with 6 nodes (3 masters + 3 replicas) for EduCRM platform.

## Architecture

- **3 Master Nodes**: redis-node-1, redis-node-2, redis-node-3 (Ports: 7001-7003)
- **3 Replica Nodes**: redis-node-4, redis-node-5, redis-node-6 (Ports: 7004-7006)
- **Cluster Bus Ports**: 17001-17006
- **Web UI**: Redis Commander on port 8081

## Quick Start

```bash
# Start Redis cluster
cd redis-cluster
docker-compose up -d

# Check cluster status
docker exec -it redis-node-1 redis-cli -p 7001 cluster info

# Check cluster nodes
docker exec -it redis-node-1 redis-cli -p 7001 cluster nodes

# Access Redis Commander web UI
open http://localhost:8081
```

## Configuration Files

Create config files for nodes 2-6 with appropriate ports:
- `redis-node-2.conf` (port 7002, bus 17002)
- `redis-node-3.conf` (port 7003, bus 17003)
- `redis-node-4.conf` (port 7004, bus 17004)
- `redis-node-5.conf` (port 7005, bus 17005)
- `redis-node-6.conf` (port 7006, bus 17006)

## Usage in Services

```javascript
const Redis = require('ioredis');

// Connect to cluster
const cluster = new Redis.Cluster([
  { host: 'localhost', port: 7001 },
  { host: 'localhost', port: 7002 },
  { host: 'localhost', port: 7003 }
]);

// Set value
await cluster.set('key', 'value');

// Get value
const value = await cluster.get('key');
```

## Performance Benefits

- **High Availability**: Automatic failover
- **Data Sharding**: Distributed across 3 masters
- **Scalability**: Add nodes without downtime
- **Low Latency**: In-memory caching
- **Persistence**: AOF + RDB snapshots

## Monitoring

Access Redis Commander at http://localhost:8081 for:
- Real-time cluster status
- Memory usage
- Key inspection
- Command statistics
