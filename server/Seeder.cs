using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;

namespace server;

public class Seeder(MyDbContext ctx, ILogger<Seeder> logger)
{
    public void Seed()
    {
        logger.LogInformation("Seeding database");
        ctx.Database.EnsureCreated();
        var exists = ctx.Users.Any(u => u.Nickname == "test");
        if (!exists)
        {
            var salt = "word";
            var password = "pass";
            ctx.Users.Add(new User
            {
                Id = Guid.NewGuid().ToString(),
                Nickname = "test",
                Hash = Convert.ToBase64String(SHA256.HashData(Encoding.UTF8.GetBytes(password + salt))),
                Salt = salt,
            });
            ctx.SaveChanges();
        }
       
    }
}