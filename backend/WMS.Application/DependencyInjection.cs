using Microsoft.Extensions.DependencyInjection;
using WMS.Application.Interfaces;
using WMS.Application.Services;

namespace WMS.Application
{
    public static class DependencyInjection
    {
        public static IServiceCollection AddApplicationServices(this IServiceCollection services)
        {
            services.AddScoped<IAuthService, AuthService>();
            services.AddScoped<IOcrProcessingService, OcrProcessingService>();
            return services;
        }
    }
}
