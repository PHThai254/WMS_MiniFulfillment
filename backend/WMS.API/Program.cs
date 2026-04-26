using Microsoft.EntityFrameworkCore;
using Microsoft.OpenApi.Models;
using WMS.Infrastructure.Data;
using WMS.Infrastructure;
using WMS.API.Middlewares;
using WMS.Application;
using System.Security.Claims;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
// Swagger/OpenAPI with JWT Authentication
builder.Services.AddSwaggerGen(options =>
{
    // Thông tin cơ bản của API
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "WMS Mini Fulfillment API",
        Version = "v1",
        Description = "API cho hệ thống quản lý kho bãi"
    });

    // THÊM JWT SECURITY SCHEME (tạo nút "Authorize" trên Swagger UI)
    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Type = SecuritySchemeType.Http,
        Scheme = "Bearer",
        BearerFormat = "JWT",
        Description = "Nhập JWT Token vào đây. Ví dụ: eyJhbGc..."
    });

    // 📌 THÊM SECURITY REQUIREMENT (tự động đính kèm token vào header)
    options.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            new string[] { }
        }
    });
});

builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddApplicationServices();
builder.Services.AddInfrastructureServices();

// Authentication (JWT Token validation)
var jwtSecret = builder.Configuration["Jwt:Key"];
var jwtIssuer = builder.Configuration["Jwt:Issuer"];
var jwtAudience = builder.Configuration["Jwt:Audience"];

if (string.IsNullOrEmpty(jwtSecret))
    throw new InvalidOperationException("Jwt:Key không được cấu hình trong appsettings.json");

builder.Services.AddAuthentication("Bearer")
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new Microsoft.IdentityModel.Tokens.TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtIssuer,
            ValidAudience = jwtAudience,
            IssuerSigningKey = new Microsoft.IdentityModel.Tokens.SymmetricSecurityKey(
                System.Text.Encoding.UTF8.GetBytes(jwtSecret))
        };
    });

// Authorization
builder.Services.AddAuthorization();

// CORS (nếu cần cho Frontend)
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

var app = builder.Build();

// 1. Global Exception Middleware (PHẢI ở đầu)
app.UseMiddleware<GlobalExceptionMiddleware>();

// 2. Redirect HTTP → HTTPS
app.UseHttpsRedirection();

// 3. CORS (nếu cần)
app.UseCors("AllowAll");

// 4. Swagger UI (chỉ trong Development)
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(options =>
    {
        options.SwaggerEndpoint("/swagger/v1/swagger.json", "WMS API v1");
        options.RoutePrefix = string.Empty; // Truy cập Swagger tại root: http://localhost:5000/
    });
}

// 5. Routing
app.UseRouting();

// 6. Authentication (xác thực token)
app.UseAuthentication();

// 7. Authorization (phân quyền)
app.UseAuthorization();

// 8. Map Controllers
app.MapControllers();

app.Run();

