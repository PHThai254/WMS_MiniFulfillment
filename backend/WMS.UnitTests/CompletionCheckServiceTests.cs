using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using WMS.Domain.Entities;
using WMS.Domain.Enums;
using WMS.Infrastructure.Data;
using WMS.Infrastructure.Services.Operations;
using Moq;
using WMS.Application.Interfaces;

namespace WMS.UnitTests;

public class CompletionCheckServiceTests
{
    private ApplicationDbContext GetInMemoryDbContext()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .ConfigureWarnings(x => x.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.InMemoryEventId.TransactionIgnoredWarning))
            .Options;
            
        var mockUserContext = new Mock<ICurrentUserContext>();
        return new ApplicationDbContext(options, mockUserContext.Object);
    }

    [Fact]
    public async Task CheckAndCompleteIssueAsync_ShouldReturnTrueAndCompleteIssue_WhenAllDetailsPicked()
    {
        // Arrange
        var db = GetInMemoryDbContext();
        var issueId = Guid.NewGuid();
        var issueDetailId = Guid.NewGuid();

        var issue = new Issue
        {
            Id = issueId,
            Status = IssueStatus.Picking,
            IssueDetails = new List<IssueDetail>
            {
                new IssueDetail
                {
                    Id = issueDetailId,
                    IssueId = issueId,
                    ProductId = Guid.NewGuid(),
                    QuantityToPick = 10,
                    PickedQuantity = 10 // Đã pick đủ
                }
            }
        };

        db.Issues.Add(issue);
        await db.SaveChangesAsync();

        var service = new CompletionCheckService(db);

        // Act
        var result = await service.CheckAndCompleteIssueAsync(issueId);

        // Assert
        result.Should().BeTrue();
        var updatedIssue = await db.Issues.FindAsync(issueId);
        updatedIssue!.Status.Should().Be(IssueStatus.Handover);
    }

    [Fact]
    public async Task CheckAndCompleteIssueAsync_ShouldReturnFalse_WhenNotAllDetailsPicked()
    {
        // Arrange
        var db = GetInMemoryDbContext();
        var issueId = Guid.NewGuid();

        var issue = new Issue
        {
            Id = issueId,
            Status = IssueStatus.Picking,
            IssueDetails = new List<IssueDetail>
            {
                new IssueDetail
                {
                    Id = Guid.NewGuid(),
                    IssueId = issueId,
                    QuantityToPick = 10,
                    PickedQuantity = 5 // Chưa pick đủ
                }
            }
        };

        db.Issues.Add(issue);
        await db.SaveChangesAsync();

        var service = new CompletionCheckService(db);

        // Act
        var result = await service.CheckAndCompleteIssueAsync(issueId);

        // Assert
        result.Should().BeFalse();
        var updatedIssue = await db.Issues.FindAsync(issueId);
        updatedIssue!.Status.Should().Be(IssueStatus.Picking);
    }
}
