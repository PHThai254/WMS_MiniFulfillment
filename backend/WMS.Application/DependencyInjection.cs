using Microsoft.Extensions.DependencyInjection;

namespace WMS.Application
{
    /// <summary>
    /// Extension methods for registering Application layer services.
    /// </summary>
    public static class DependencyInjection
    {
        /// <summary>
        /// Adds Application layer services to the dependency injection container.
        /// </summary>
        /// <param name="services">The service collection to add services to.</param>
        /// <returns>The service collection for chaining.</returns>
        public static IServiceCollection AddApplicationServices(this IServiceCollection services)
        {
            // Register Application layer services (Use Cases, Validators, Mappers, etc.) here
            
            return services;
        }
    }
}
