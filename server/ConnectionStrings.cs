namespace server;

public class ConnectionStrings
{
    public string DbConnectionString { get; set; }
    public string MqttBroker { get; set; }
    public int MqttPort { get; set; }
    public bool UseSeaFullstackDataSources { get; set; } = true;
    public string Secret { get; set; }
}