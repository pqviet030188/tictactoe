using System;

namespace Tictactoe.Types.Attributes;

[AttributeUsage(AttributeTargets.Method, AllowMultiple = false)]
public class UseRoomAuthorisationAttribute : Attribute
{
}
