using Jellyfin.Plugin.Afterglow.Configuration;
using Xunit;

namespace Jellyfin.Plugin.Afterglow.Tests;

public class ConfigChoicesTests
{
    [Theory]
    [InlineData("top", "top")]
    [InlineData("afterContinue", "afterContinue")]
    [InlineData("end", "end")]
    public void A_known_top_ten_position_is_kept(string given, string expected)
    {
        Assert.Equal(expected, ConfigChoices.TopTenPosition(given));
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("somewhere else")]
    [InlineData("<script>")]
    public void An_unknown_top_ten_position_becomes_the_default(string? given)
    {
        Assert.Equal("top", ConfigChoices.TopTenPosition(given));
    }

    [Theory]
    [InlineData("watched")]
    [InlineData("rated")]
    [InlineData("daily")]
    public void A_known_top_ten_mode_is_kept(string given)
    {
        Assert.Equal(given, ConfigChoices.TopTenMode(given));
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("random")]
    public void An_unknown_top_ten_mode_becomes_the_default(string? given)
    {
        Assert.Equal("watched", ConfigChoices.TopTenMode(given));
    }

    [Theory]
    [InlineData("bottomLeft")]
    [InlineData("bottomRight")]
    [InlineData("topLeft")]
    public void A_known_quality_corner_is_kept(string given)
    {
        Assert.Equal(given, ConfigChoices.QualityCorner(given));
    }

    [Theory]
    [InlineData(null)]
    [InlineData("topRight")]
    [InlineData("\"; alert(1)")]
    public void An_unknown_quality_corner_becomes_the_default(string? given)
    {
        Assert.Equal("bottomLeft", ConfigChoices.QualityCorner(given));
    }
}
