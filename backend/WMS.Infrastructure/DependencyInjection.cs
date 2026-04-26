using Microsoft.Extensions.DependencyInjection;

using WMS.Application.Interfaces;
using WMS.Infrastructure.Repositories;

namespace WMS.Infrastructure;

/// <summary>
/// Extension methods for registering Infrastructure layer services.
/// </summary>
public static class DependencyInjection
{
    /// <summary>
    /// Adds Infrastructure layer services to the dependency injection container.
    /// </summary>
    /// <param name="services">The service collection to add services to.</param>
    /// <returns>The service collection for chaining.</returns>
    public static IServiceCollection AddInfrastructureServices(this IServiceCollection services)
    {
        // Register Repository implementations
        services.AddScoped<IUserRepository, UserRepository>();
        
        return services;
    }
}
