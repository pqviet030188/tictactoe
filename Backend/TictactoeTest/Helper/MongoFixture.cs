using Mongo2Go;
using MongoDB.Driver;

namespace TictactoeTest.Helper;

public class MongoFixture : IDisposable
{
    public MongoDbRunner Runner { get; }
    public IMongoClient Client { get; }
    public IMongoDatabase Database { get; }

    public MongoFixture()
    {
        Runner = MongoDbRunner.Start(singleNodeReplSet: true);
        Client = new MongoClient(Runner.ConnectionString);
        Database = Client.GetDatabase("TestDb");
    }

    public void Dispose()
    {
        Runner?.Dispose();
        GC.SuppressFinalize(this);
    }
}