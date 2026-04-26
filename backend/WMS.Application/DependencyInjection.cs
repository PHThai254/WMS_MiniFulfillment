using Microsoft.Extensions.DependencyInjection;

using WMS.Application.Interfaces;
using WMS.Application.Services;

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
            // Register Authentication Service (Use Cases, Validators, Mappers, etc.)
            services.AddScoped<IAuthService, AuthService>();
            
            return services;
        }
    }
}
