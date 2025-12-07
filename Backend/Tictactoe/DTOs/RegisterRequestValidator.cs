using FluentValidation;

namespace Tictactoe.DTOs;

public class RegisterRequestValidator : AbstractValidator<RegisterRequest>
{
    public RegisterRequestValidator()
    {
        RuleFor(x => x.Email)
            .NotEmpty().WithMessage("Email is required")
            .EmailAddress().WithMessage("Please enter a valid email address");

        RuleFor(x => x.Password)
            .NotEmpty().WithMessage("Password is required")
            .MinimumLength(8).WithMessage("Password must be at least 8 characters long")
            .Matches(@"(?=.*[a-z])").WithMessage("Password must contain at least one lowercase letter")
            .Matches(@"(?=.*[A-Z])").WithMessage("Password must contain at least one uppercase letter")
            .Matches(@"(?=.*\d)").WithMessage("Password must contain at least one number")
            .Matches(@"(?=.*[!@#$%^&*(),.?"":{}|<>])").WithMessage("Password must contain at least one special character");
            
        RuleFor(x => x.ConfirmPassword)
            .NotEmpty().WithMessage("Please confirm your password")
            .Equal(x => x.Password).WithMessage("Passwords do not match");
    }
}